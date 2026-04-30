declare module 'zongji' {
  interface ZongJiOptions {
    host: string;
    user: string;
    password: string;
    port?: number;
    database?: string;
  }

  type ZongJiEvent = any;

  type ZongJiCallback = (event: ZongJiEvent) => void;

  class ZongJi {
    constructor(options: ZongJiOptions);

    start(options?: any): void;
    stop(): void;

    on(event: 'binlog', cb: ZongJiCallback): void;
    on(event: 'error', cb: (err: Error) => void): void;
  }

  export = ZongJi;
}
