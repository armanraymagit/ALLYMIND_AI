export class OpenAIEmbeddingFunction {
    constructor(configuration: any) { }
    public async generate(texts: string[]): Promise<number[][]> {
        console.warn("Using stubbed OpenAIEmbeddingFunction");
        return [];
    }
}

export class DefaultEmbeddingFunction {
    public async generate(texts: string[]): Promise<number[][]> {
        console.warn("Using stubbed DefaultEmbeddingFunction");
        return [];
    }
}