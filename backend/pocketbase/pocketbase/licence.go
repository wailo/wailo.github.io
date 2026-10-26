package main

import (
	"crypto/rand"
	// "crypto/ecdsa"
	// "crypto/sha256"
	// "crypto/x509"
	"crypto/ed25519"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	// "encoding/pem"
	"errors"
	"golang.org/x/crypto/ssh"
	"io/ioutil"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/osutils"
)

var privateKey ed25519.PrivateKey

const accountKeyField = "accountKey"

func generateAccountCode() (string, error) {
	digits := make([]byte, 16)
	limit := big.NewInt(10)
	for i := range digits {
		n, err := rand.Int(rand.Reader, limit)
		if err != nil {
			return "", err
		}
		digits[i] = byte('0' + n.Int64())
	}
	return string(digits), nil
}

func hashAccountCode(code string) string {
	digest := sha256.Sum256([]byte(code))
	return hex.EncodeToString(digest[:])
}

func setRateLimit(rules []core.RateLimitRule, rule core.RateLimitRule) []core.RateLimitRule {
	for i := range rules {
		if rules[i].Label == rule.Label && rules[i].Audience == rule.Audience {
			rules[i] = rule
			return rules
		}
	}
	return append(rules, rule)
}

func configureAccountAuth(app core.App) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	field, _ := users.Fields.GetByName(accountKeyField).(*core.TextField)
	if field == nil {
		field = &core.TextField{Name: accountKeyField}
		users.Fields.Add(field)
	}
	field.Hidden = true
	field.Min = 64
	field.Max = 64
	field.Pattern = "^[a-f0-9]{64}$"

	if email, ok := users.Fields.GetByName(core.FieldNameEmail).(*core.EmailField); ok {
		email.Required = false
	}

	users.AddIndex("idx_users_account_key", true, "`accountKey`", "`accountKey` != ''")
	users.PasswordAuth.Enabled = true
	// Retain email temporarily so existing development accounts keep working.
	users.PasswordAuth.IdentityFields = []string{accountKeyField, core.FieldNameEmail}
	users.OTP.Enabled = false
	users.CreateRule = nil

	if err := app.Save(users); err != nil {
		return err
	}

	settings := app.Settings()
	settings.RateLimits.Enabled = true
	settings.RateLimits.Rules = setRateLimit(settings.RateLimits.Rules, core.RateLimitRule{
		Label:       "POST /api/account-number",
		Audience:    core.RateLimitRuleAudienceGuest,
		Duration:    3600,
		MaxRequests: 10,
	})
	settings.RateLimits.Rules = setRateLimit(settings.RateLimits.Rules, core.RateLimitRule{
		Label:       "POST /api/accounts/sign-in",
		Audience:    core.RateLimitRuleAudienceGuest,
		Duration:    60,
		MaxRequests: 10,
	})

	return app.Save(settings)
}

func generateAvailableAccountCode(app core.App) (string, error) {
	for range 10 {
		code, err := generateAccountCode()
		if err != nil {
			return "", err
		}

		_, err = app.FindFirstRecordByData("users", accountKeyField, hashAccountCode(code))
		if errors.Is(err, sql.ErrNoRows) {
			return code, nil
		}
		if err != nil {
			return "", err
		}
	}

	return "", errors.New("failed to generate a unique account code")
}

func authenticateOrCreateAccount(app core.App, code string, name string) (*core.Record, string, bool, error) {
	if len(code) != 16 {
		return nil, "", false, errors.New("account number must contain 16 digits")
	}
	for _, digit := range code {
		if digit < '0' || digit > '9' {
			return nil, "", false, errors.New("account number must contain only digits")
		}
	}

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return nil, "", false, err
	}

	key := hashAccountCode(code)
	record, err := app.FindFirstRecordByData("users", accountKeyField, key)
	created := false
	if errors.Is(err, sql.ErrNoRows) {
		name = strings.TrimSpace(name)
		if name == "" {
			return nil, "", false, errors.New("account does not exist")
		}

		record = core.NewRecord(users)
		record.Set(accountKeyField, key)
		record.SetPassword(code)
		record.Set("name", name)
		record.Set("role", "student")
		if err := app.Save(record); err != nil {
			return nil, "", false, err
		}
		created = true
	} else if err != nil {
		return nil, "", false, err
	} else if !record.ValidatePassword(code) {
		return nil, "", false, errors.New("invalid account number")
	}

	token, err := record.NewAuthToken()
	if err != nil {
		return nil, "", false, err
	}
	return record, token, created, nil
}

// Struct used only if you want to return a typed payload
type LicensePayload struct {
	User     string `json:"user"`
	Licensed bool   `json:"licensed"`
	Exp      int64  `json:"exp"`
}

// // ECDSA
// func loadPrivateKey(path string) (*ecdsa.PrivateKey, error) {
// 	data, err := ioutil.ReadFile(path)
// 	if err != nil {
// 		return nil, err
// 	}
// 	block, _ := pem.Decode(data)
// 	if block == nil {
// 		return nil, errors.New("failed to decode PEM block")
// 	}
// 	return x509.ParseECPrivateKey(block.Bytes)
// }

// // ECDSA
// func signPayload(payload map[string]interface{}, privKey *ecdsa.PrivateKey) (string, error) {
// 	jsonBytes, err := json.Marshal(payload)
// 	if err != nil {
// 		return "", err
// 	}
// 	hash := sha256.Sum256(jsonBytes)
// 	r, s, err := ecdsa.Sign(rand.Reader, privKey, hash[:])
// 	if err != nil {
// 		return "", err
// 	}
// 	signatureBytes := append(r.Bytes(), s.Bytes()...)
// 	return base64.StdEncoding.EncodeToString(signatureBytes), nil
// }

func loadEd25519PrivateKey(path string) (ed25519.PrivateKey, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	log.Printf("File loaded successfully\n")

	// Parse the OpenSSH private key
	key, err := ssh.ParseRawPrivateKey(data)
	if err != nil {
		return nil, err
	}

	log.Printf("Parsed key type: %T\n", key)

	// Handle both direct and pointer types
	switch k := key.(type) {
	case ed25519.PrivateKey:
		return k, nil
	case *ed25519.PrivateKey:
		return *k, nil
	default:
		return nil, errors.New("not an ed25519 private key")
	}
}

func signPayload(contentBytes []byte, privKey ed25519.PrivateKey) (string, error) {
	signature := ed25519.Sign(privKey, contentBytes)
	return base64.StdEncoding.EncodeToString(signature), nil
}

func checkLicenseStatus(userId string, auth *core.Record, app *pocketbase.PocketBase) (map[string]interface{}, error) {
	if auth == nil {
		return nil, errors.New("not authenticated")
	}
	if userId == "" {
		userId = auth.Id
	}
	if auth.GetString("role") != "admin" && auth.Id != userId {
		return nil, errors.New("not authorized")
	}

	record, err := app.FindFirstRecordByFilter("licence", "user = {:user}", dbx.Params{"user": userId})
	if err != nil {
		return nil, errors.New("license not found")
	}

	active := record.GetBool("active")
	expiresAt := record.GetDateTime("expires_at")

	expired := time.Now().After(expiresAt.Time())

	message := "ok"
	if expired {
		message = "Expired license"
	} else if !active {
		message = "License is not active"
	}

	valid := !expired && active

	return map[string]interface{}{
		"user":       userId,
		"active":     active,
		"valid":      valid,
		"expires_at": expiresAt,
		"message":    message,
	}, nil
}

func main() {
	app := pocketbase.New()

	jsvm.MustRegister(app, jsvm.Config{})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  osutils.IsProbablyGoRun(),
	})

	// Load the ECDSA private key on bootstrap
	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		var err error
		// privateKey, err = loadPrivateKey("/app/keys/private_key.pem")
		privateKey, err = loadEd25519PrivateKey("/app/keys/pb_ed25519")
		if err != nil {
			log.Fatalf("Failed to load private key: %v", err)
		}

		if err := e.Next(); err != nil {
			return err
		}
		return configureAccountAuth(app)
	})

	// Register route after bootstrap
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.POST("/api/account-number", func(c *core.RequestEvent) error {
			code, err := generateAvailableAccountCode(c.App)
			if err != nil {
				return c.InternalServerError("Failed to generate account number.", err)
			}

			return c.JSON(200, map[string]string{"code": code})
		})

		e.Router.POST("/api/accounts/sign-in", func(c *core.RequestEvent) error {
			request := struct {
				Code string `json:"code"`
				Name string `json:"name"`
			}{}
			if err := c.BindBody(&request); err != nil {
				return c.BadRequestError("Invalid account request.", err)
			}

			record, token, created, err := authenticateOrCreateAccount(c.App, request.Code, request.Name)
			if err != nil {
				return c.BadRequestError("Unable to sign in with this account number.", err)
			}

			return c.JSON(200, map[string]interface{}{
				"token":   token,
				"record":  record.PublicExport(),
				"created": created,
			})
		})

		e.Router.GET("/licence/{userId...}", func(c *core.RequestEvent) error {
			auth := c.Auth
			userId := c.Request.PathValue("userId")

			payload, err := checkLicenseStatus(userId, auth, app)
			if err != nil {
				return c.JSON(401, map[string]string{"error": err.Error()})
			}

			// Encode the payload to base64
			jsonBytes, err := json.Marshal(payload)
			if err != nil {
				panic(err)
			}
			encoded_payload := base64.StdEncoding.EncodeToString(jsonBytes)

			// Sign the payload
			signature, err := signPayload([]byte(encoded_payload), privateKey)
			if err != nil {
				return c.JSON(500, map[string]string{"error": "failed to sign payload"})
			}

			return c.JSON(200, map[string]interface{}{
				"payload":   encoded_payload,
				"signature": signature,
			})
		}).Bind(apis.RequireAuth())

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
