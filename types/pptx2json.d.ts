declare module "pptx2json" {
  type PptxJson = Record<string, unknown>;

  class PPTX2Json {
    toJson(input: Buffer | string): Promise<PptxJson>;
  }

  export = PPTX2Json;
}
