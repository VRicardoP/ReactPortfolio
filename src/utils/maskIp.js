const maskIp = (ip) => {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;

    const segments = ip.split(':');
    if (segments.length > 1) {
        segments[segments.length - 1] = '****';
        return segments.join(':');
    }
    return ip;
};

export default maskIp;
