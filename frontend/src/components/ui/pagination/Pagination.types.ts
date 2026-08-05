export type PaginationProps = {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
};
