/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    // output: 'standalone', // Firebase webframeworks handles this, but explicit is okay. 
    // Actually, for webframeworks, we usually don't need standalone. 
    // But let's stick to the basics first.
};

export default nextConfig;
