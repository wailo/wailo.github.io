// RemoteCallManager.ts
export type RemoteCall =
  | {
      type: "call";
      path: string[];
      args?: any[];
      clientId?: string;
      version?: string;
      timestamp?: number;
    }
  export type RemoteEvent = {
      type: "key";
      key: string;
      code: string;
      keyCode: number;
      charCode: number;
      mods: {
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
        meta: boolean;
      };
      clientId?: string;
      version?: string;
      timestamp?: number;
    };

export class RemoteCallManager {
  constructor(
    private send: (call: RemoteCall | RemoteEvent) => void,
    private contextRoot: Record<string, any>
  ) {}

  private proxyCache = new WeakMap<object, any>();

public createMirroredProxy(path: string[], target: any): any {
  return new Proxy(target, {
    set(target, prop, value) {
      return Reflect.set(target, prop, value);
    },

    get: (obj, prop, receiver) => {
      const value = Reflect.get(obj, prop, receiver);

      if (typeof value === 'function') {
        const propStr = prop.toString();
        const isAllowed =
          propStr.startsWith('api_set') ||
          propStr.startsWith('notifyUser');

        if (isAllowed) {
          return this.wrapFunction(value.bind(obj), [...path, propStr]);
        }
      }

      if (value && typeof value === 'object' && this.isPlainObject(value)) {
        if (this.proxyCache.has(value)) {
          return this.proxyCache.get(value);
        }

        const proxied = this.createMirroredProxy([...path, prop.toString()], value);
        this.proxyCache.set(value, proxied);
        return proxied;
      }

      return value;
    },

    has(target, prop) {
      return Reflect.has(target, prop);
    },
  });
}

private isPlainObject(val: any): val is Record<string, any> {
  return Object.prototype.toString.call(val) === '[object Object]';
}


  public sendKeyMirror(e: KeyboardEvent) {
    const call: RemoteEvent = {
      type : "key",
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      charCode: e.charCode || e.key.charCodeAt(0),
      mods: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      },
      timestamp: Date.now(),
    };

    this.send(call);
  }

  public handleIncomingMessage(message: string) {
    let data: RemoteCall | RemoteEvent;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("JSON parse error:", err, "Original data:", message);
      return;
    }

    if (data.type === "call") {
      this.executeRemoteCall(data);
    } else if (data.type === "key") {
      this.regenerateKeyboardEvent(data);
    } else {
      console.warn("Unknown message type");
    }
  }

  private wrapFunction(
    fn: (...args: any[]) => any,
    path: string[]
  ): (...args: any[]) => any {
    return (...args: any[]) => {
      const fromRemote = args[0]?.__fromRemote;
      if (!fromRemote) {
        this.send({
          type: "call",
          path,
          args,
          timestamp: Date.now(),
        });
      }

      return fn.apply(null, args);
    };
  }

  private executeRemoteCall(call: RemoteCall) {
    const { path, args = [] } = call;

    if (!Array.isArray(path) || path.length < 1 || !this.isSafePath(path)) {
      console.error("Invalid or unsafe path:", path);
      return;
    }

    const context =
      path.length > 1
        ? path.slice(0, -1).reduce((obj, key) => obj?.[key], this.contextRoot)
        : this.contextRoot;

    const func = context?.[path[path.length - 1]];

    if (typeof func === "function") {
      try {
        func.apply(context, args);
      } catch (err) {
        console.error("Function execution error:", err);
      }
    } else {
      console.warn("Function not found or invalid:", path.join("."));
    }
  }

  private regenerateKeyboardEvent(msg: RemoteEvent) {
    const event = new KeyboardEvent("keydown", {
      key: msg.key,
      code: msg.code,
      charCode: msg.charCode,
      keyCode: msg.keyCode,
      ctrlKey: msg.mods.ctrl,
      shiftKey: msg.mods.shift,
      altKey: msg.mods.alt,
      metaKey: msg.mods.meta,
      bubbles: true,
      cancelable: true,
    });

    this.contextRoot.GLFW?.onKeydown?.(event);
  }

  private isSafePath(path: string[]): boolean {
    return path.every(
      (key) =>
        typeof key === "string" &&
        key !== "__proto__" &&
        key !== "constructor" &&
        key !== "prototype"
    );
  }
}
