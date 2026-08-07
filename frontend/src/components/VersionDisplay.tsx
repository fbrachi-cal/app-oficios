import React from 'react';
import config from '../config';

interface VersionDisplayProps {
  className?: string;
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ className = "" }) => {
  return (
    <div className={`text-center text-xs text-slate-400 font-semibold tracking-wide select-none ${className}`}>
      v{config.appVersion}
    </div>
  );
};

export default VersionDisplay;
