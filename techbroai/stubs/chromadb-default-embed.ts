export class OpenAIEmbeddingFunction {
    constructor(_: any) { }
    public async generate(_: string[]): Promise<number[][]> {
        console.warn("Using stubbed OpenAIEmbeddingFunction");
        return [];
    }
}

export class DefaultEmbeddingFunction {
    public async generate(_: string[]): Promise<number[][]> {
        console.warn("Using stubbed DefaultEmbeddingFunction");
        return [];
    }
}
