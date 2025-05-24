import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';

interface Props {
  onClick: () => void;
}

export const ChatIcon: React.FC<Props> = ({ onClick }) => {
  const { unreadCount } = useChatContext();
  return (
    <button onClick={onClick} className="relative p-2 hover:bg-gray-100 rounded-full">
      <MessageCircle className="w-6 h-6 text-gray-700" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount}
        </span>
      )}
    </button>
  );
};