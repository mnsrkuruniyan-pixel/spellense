declare module "page-flip" {
  export class PageFlip {
    constructor(element: HTMLElement, settings?: Record<string, unknown>);
    destroy(): void;
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    loadFromImages(images: string[]): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    update(): void;
    on(event: string, callback: (e: { data: unknown }) => void): void;
  }
}
