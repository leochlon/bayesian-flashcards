import React from 'react';
import '../../styles/views/stats.css';

const StatsModal = ({ onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content stats-modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose}>&times;</button>
      {children}
    </div>
  </div>
);

export default StatsModal;
