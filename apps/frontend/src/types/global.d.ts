interface PaginationParams {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  visibilityTypes?: number[];
  statuses?: number[];
  priorities?: number[];
  priceMin?: number | null;
  priceMax?: number | null;
}
