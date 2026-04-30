declare module 'zongji' {
  interface ZongJiOptions {
    host: string;
    user: string;
    password: string;
    port?: number;
    database?: string;
  }

  type ZongJiEvent = {
    getTypeName?(): string;
    tableName: string;
  };

  type ZongJiCallback = (event: ZongJiEvent) => void;

  class ZongJi {
    constructor(options: ZongJiOptions);

    start(options?: object): void;
    stop(): void;

    on(event: 'binlog', cb: ZongJiCallback): void;
    on(event: 'error', cb: (err: Error) => void): void;
  }

  export = ZongJi;
}
