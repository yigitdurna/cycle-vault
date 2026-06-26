import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass rounded-3xl p-6 w-full max-w-sm relative z-10"
          >
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-ink/65 text-sm mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl glass text-sm font-medium hover:bg-ink/[0.07] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl bg-menstrual text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
