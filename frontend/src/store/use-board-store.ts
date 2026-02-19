import { create } from "zustand";

type BoardView = "COMMERCIAL" | "SALES" | "TOP10" | "INTERNAL_OPS";

type BoardStore = {
  currentBoard: BoardView;
  setCurrentBoard: (board: BoardView) => void;
};

export const useBoardStore = create<BoardStore>((set) => ({
  currentBoard: "COMMERCIAL",
  setCurrentBoard: (board) => set({ currentBoard: board }),
}));
