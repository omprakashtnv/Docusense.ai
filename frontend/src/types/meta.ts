export interface PublicMeta {
  application: {
    name: string;
    version: string;
  };
  ai: {
    provider: string;
    embeddingModel: string;
    embeddingDimensions: number;
    generationModel: string;
  };
}
