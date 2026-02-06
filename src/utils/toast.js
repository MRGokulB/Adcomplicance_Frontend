import toast from 'react-hot-toast';

// wrapper for consistent configuration
const config = {
    duration: 4000,
    position: 'top-right',
    style: {
        fontFamily: 'inherit',
        borderRadius: '8px',
    },
};

export const notify = {
    success: (msg) => toast.success(msg, config),
    error: (msg) => toast.error(msg, config),
    info: (msg) => toast(msg, { ...config, icon: 'ℹ️' }),
    loading: (msg) => toast.loading(msg, config),
    dismiss: (id) => toast.dismiss(id),
};

export default toast;
