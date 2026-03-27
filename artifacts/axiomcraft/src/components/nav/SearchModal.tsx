/**
 * SearchModal — full-screen frosted-glass command-palette overlay.
 *
 * Triggered by: Navbar search button or ⌘K / Ctrl+K keyboard shortcut.
 * Closes by: clicking the backdrop or pressing Escape (handled by SearchBar).
 *
 * Visual:
 *  - Frosted dark backdrop (`.search-modal-backdrop`)
 *  - Centered panel with a top cyan accent hairline
 *  - `SearchBar` component handles the actual input + results
 *
 * Self-contained: copy this file + SearchBar + the CSS class
 * `.search-modal-backdrop` and it works in any Framer Motion project.
 */

import { AnimatePresence, motion } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";

/* ─── ANIMATION VARIANTS ────────────────────────────────────────────────── */
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};

const panelVariants = {
  hidden:  { y: -16, opacity: 0, scale: 0.98 },
  visible: { y: 0,   opacity: 1, scale: 1 },
  exit:    { y: -16, opacity: 0, scale: 0.98 },
};

/* ─── PROPS ─────────────────────────────────────────────────────────────── */
interface SearchModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  return (
    /* ===== Search Modal Start ===== */
    <AnimatePresence>
      {isOpen && (
        <motion.div
          /* Frosted backdrop — click outside the panel to close */
          className="search-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* ── Search Panel ── */}
          <motion.div
            className="search-modal-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Top cyan accent hairline */}
            <div className="search-modal-accent-line" aria-hidden="true" />

            {/* Search input + results */}
            <SearchBar onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    /* ===== Search Modal End ===== */
  );
}
