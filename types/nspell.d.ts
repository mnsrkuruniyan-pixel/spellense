declare module "nspell" {
  type NSpellDictionary = string | string[] | Record<string, unknown>;

  type NSpellInstance = {
    correct(word: string): boolean;
    suggest(word: string): string[];
  };

  const nspell: (dictionary: NSpellDictionary) => NSpellInstance;

  export default nspell;
}
