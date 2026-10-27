(function (root, factory) {
    const media = factory();
    if (typeof module === 'object' && module.exports) module.exports = media;
    else root.ProjectMedia = media;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // Split pasted lists without splitting the comma inside a data URL or a URL query.
    function parseImages(value) {
        const values = Array.isArray(value) ? value : [value];
        const images = values.flatMap(item => String(item || '').split(/(?:,\s*(?=(?:https?:\/\/|data:image\/|[\r\n]|$))|[\r\n]+)/i));
        return [...new Set(images.map(src => src.trim()).filter(Boolean))];
    }

    function getImages(project) {
        return parseImages([project.image_url].concat(project.media_images || []));
    }

    function isWebUrl(value) {
        try { return ['https:', 'http:'].includes(new URL(value).protocol); }
        catch { return false; }
    }

    function isImageSource(value) {
        return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(value) || isWebUrl(value);
    }

    function videoSource(value) {
        const src = String(value || '').trim();
        if (!src) return { kind: 'empty', src: '' };
        if (/^data:video\/(?:mp4|webm|ogg);base64,[a-z0-9+/=\s]+$/i.test(src)) return { kind: 'file', src };
        if (!isWebUrl(src)) return { kind: 'invalid', src: '' };
        const url = new URL(src);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        let id = '';
        if (host === 'youtu.be') id = url.pathname.split('/')[1];
        if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
            const parts = url.pathname.split('/');
            id = ['embed', 'shorts', 'live'].includes(parts[1]) ? parts[2] : url.searchParams.get('v');
        }
        if (/^[a-z0-9_-]{11}$/i.test(id || '')) return { kind: 'youtube', src: 'https://www.youtube.com/embed/' + id };
        if (/\.(mp4|webm|ogg|ogv)$/i.test(url.pathname)) return { kind: 'file', src };
        return { kind: 'link', src };
    }

    return { parseImages, getImages, isWebUrl, isImageSource, videoSource, maxGalleryImages: 8 };
});
