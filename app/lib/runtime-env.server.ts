let currentEnv: Env | null = null;
let currentMode: string | null = null;

export function setRuntimeEnv(env: Env, mode?: string) {
    currentEnv = env;
    currentMode = mode ?? currentMode;
}

export function getRuntimeEnv(): Env | null {
    return currentEnv;
}

export function getRuntimeMode(): string | null {
    return currentMode;
}
