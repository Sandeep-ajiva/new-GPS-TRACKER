type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
}

export class CircuitBreaker {
    private state: CircuitBreakerState = "CLOSED";
    private failureCount = 0;
    private nextAttempt = Date.now();
    private failureThreshold: number;
    private resetTimeout: number;

    constructor(options: CircuitBreakerOptions = { failureThreshold: 3, resetTimeout: 5000 }) {
        this.failureThreshold = options.failureThreshold;
        this.resetTimeout = options.resetTimeout;
    }

    public async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            if (Date.now() > this.nextAttempt) {
                this.state = "HALF_OPEN";
            } else {
                throw new Error("Circuit Breaker is OPEN. Request blocked.");
            }
        }

        try {
            const response = await action();
            this.onSuccess();
            return response;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failureCount = 0;
        this.state = "CLOSED";
    }

    private onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.state = "OPEN";
            this.nextAttempt = Date.now() + this.resetTimeout;
        }
    }
}

export const apiCircuitBreaker = new CircuitBreaker();
