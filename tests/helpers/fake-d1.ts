type Method = "first" | "all" | "run" | "batch";

type Matcher = string | RegExp;

type CallRecord = {
    method: Method;
    sql: string;
    bindings: unknown[];
};

type Handler = {
    match: Matcher;
    first?: unknown[];
    all?: unknown[];
    run?: unknown[];
};

function matches(sql: string, matcher: Matcher) {
    return typeof matcher === "string" ? sql.includes(matcher) : matcher.test(sql);
}

export class FakePreparedStatement {
    private bindings: unknown[] = [];

    constructor(
        private readonly db: FakeD1Database,
        readonly sql: string
    ) {}

    bind(...values: unknown[]) {
        this.bindings = values;
        return this;
    }

    async first<T>() {
        return this.db.consume("first", this.sql, this.bindings) as T;
    }

    async all<T>() {
        return this.db.consume("all", this.sql, this.bindings) as T;
    }

    async run<T>() {
        return this.db.consume("run", this.sql, this.bindings) as T;
    }
}

export class FakeD1Database {
    readonly calls: CallRecord[] = [];

    constructor(private readonly handlers: Handler[]) {}

    prepare(sql: string) {
        return new FakePreparedStatement(this, sql);
    }

    async batch(statements: Array<FakePreparedStatement | D1PreparedStatement>) {
        const typedStatements = statements as FakePreparedStatement[];
        this.calls.push(
            ...typedStatements.map((statement) => ({
                method: "batch" as const,
                sql: statement.sql,
                bindings: (statement as unknown as { bindings?: unknown[] }).bindings ?? [],
            }))
        );
        return typedStatements.map(() => ({ meta: {} }));
    }

    consume(method: Exclude<Method, "batch">, sql: string, bindings: unknown[]) {
        this.calls.push({ method, sql, bindings });
        const handler = this.handlers.find((entry) => matches(sql, entry.match));
        if (!handler) {
            throw new Error(`No fake D1 handler for ${method}: ${sql}`);
        }

        const queue = handler[method];
        if (!queue || queue.length === 0) {
            throw new Error(`No queued ${method} response for SQL: ${sql}`);
        }
        return queue.shift();
    }

    countCalls(pattern: Matcher, method?: Method) {
        return this.calls.filter((call) => (!method || call.method === method) && matches(call.sql, pattern)).length;
    }
}
