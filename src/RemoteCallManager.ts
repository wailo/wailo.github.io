export type RemoteCall = {
  type: "call";
  path: string[];
  args?: any[];
  clientId?: string;
  version?: string;
  timestamp?: number;
};

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
  // private proxyCache = new WeakMap<object, any>();
  private contextRoot: Record<string, any> = {};
  private allowedPrefixes = new WeakMap<object, string[]>();

  constructor(
    private send: (call: RemoteCall | RemoteEvent) => void
  ) {}

  // Updated: Takes a name to register in contextRoot
  public wrapObject(name: string, obj: Record<string, any>, allowedFnPrefixes: string[]): void {
    this.contextRoot[name] = obj;
    this.allowedPrefixes.set(obj, allowedFnPrefixes);

    const visited = new WeakSet();

    const recurse = (target: any, path: string[] = [name]) => {
      if (!this.isPlainObject(target) || visited.has(target)) return;
      visited.add(target);

      for (const key of Object.keys(target)) {
        const value = target[key];
        const currentPath = [...path, key];

        if (typeof value === "function" && this.isAllowed(obj, key)) {
          target[key] = this.wrapFunction(value.bind(target), currentPath);
        } else if (this.isPlainObject(value)) {
          recurse(value, currentPath);
        }
      }
    };

    recurse(obj);
  }

  private isAllowed(obj: object, fnName: string): boolean {
    const prefixes = this.allowedPrefixes.get(obj);
    return prefixes?.some(prefix => fnName.startsWith(prefix)) ?? false;
  }

  private wrapFunction(fn: (...args: any[]) => any, path: string[]): (...args: any[]) => any {
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
      return fn(...args);
    };
  }

  public sendKeyMirror(e: KeyboardEvent) {
    const call: RemoteEvent = {
      type: "key",
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

  private executeRemoteCall(call: RemoteCall) {
    const { path, args = [] } = call;
    if (!Array.isArray(path) || path.length < 1 || !this.isSafePath(path)) {
      console.error("Invalid or unsafe path:", path);
      return;
    }

    let context = this.contextRoot;
    for (let i = 0; i < path.length - 1; i++) {
      context = context?.[path[i]];
    }

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

  private isPlainObject(val: any): val is Record<string, any> {
    return Object.prototype.toString.call(val) === "[object Object]";
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
