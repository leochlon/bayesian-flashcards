import { useState, useCallback } from 'react';

// Custom hook to manage the show/hide state for the delete deck modal
export default function useShowDeleteDeckModal() {
  const [showDeleteDeckModal, setShowDeleteDeckModal] = useState(false);
  const openDeleteDeckModal = useCallback(() => setShowDeleteDeckModal(true), []);
  const closeDeleteDeckModal = useCallback(() => setShowDeleteDeckModal(false), []);
  return { showDeleteDeckModal, openDeleteDeckModal, closeDeleteDeckModal, setShowDeleteDeckModal };
}
