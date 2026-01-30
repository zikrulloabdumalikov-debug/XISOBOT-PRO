import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title, message,
  confirmText = "Ha, tasdiqlayman",
  cancelText = "Bekor qilish",
  variant = 'danger'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center -mt-6">
        <div className={`p-4 rounded-full mb-4 ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {variant === 'danger' ? <AlertTriangle size={32} /> : <HelpCircle size={32} />}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">{message}</p>
        
        <div className="flex w-full space-x-3">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="flex-1 justify-center py-2.5"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 justify-center py-2.5"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};