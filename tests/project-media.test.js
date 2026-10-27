const test = require('node:test');
const assert = require('node:assert/strict');
const media = require('../project-media');

const ids = [
    'da9e5bbd-0e87-48ef-920c-a69d8e91544e',
    '41938b40-752d-490e-a51f-6f1ef703b5be',
    '870457bf-4211-479a-817b-04db1a70f0fe',
    'f8455cde-ac9a-43d0-a756-05f52fdcff19',
    'aad41341-d5ee-467e-bbf6-a9d086e5283e',
    'd3bab98b-f868-4fda-95b4-884953876c73'
];
const urls = ids.map(id => `https://mediadrop-sakinzo.lovable.app/api/public/f/${id}.png`);

test('the six pasted MediaDrop links become six separate images', () => {
    assert.deepEqual(media.parseImages(urls.join(', ')), urls);
    assert.deepEqual(media.parseImages(urls.join(',\r\n')), urls);
    assert.deepEqual(media.parseImages(urls.join('\n')), urls);
});

test('uploaded image data and commas in a single URL stay intact', () => {
    const uploaded = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=';
    const query = 'https://example.com/image?crop=10,20,30,40';
    assert.deepEqual(media.parseImages(`${uploaded}, ${query}\n${urls[0]}`), [uploaded, query, urls[0]]);
    assert.equal(media.isImageSource(uploaded), true);
});

test('old saved comma lists render correctly and the cover is not duplicated', () => {
    assert.deepEqual(media.getImages({ image_url: urls[0], media_images: [urls.join(', ')] }), urls);
    assert.deepEqual(media.getImages({ image_url: urls.join(', '), media_images: [urls[0]] }), urls);
    assert.deepEqual(media.getImages({ media_images: urls.join(', ') }), urls);
});

test('extra images remain available for explicit validation instead of being silently discarded', () => {
    const images = Array.from({ length: 9 }, (_, i) => `https://example.com/${i}.png`);
    assert.equal(media.parseImages(images).length, 9);
    assert.equal(media.maxGalleryImages, 8);
    assert.deepEqual(media.parseImages([urls[0], '', ` ${urls[0]} `, urls[1]]), urls.slice(0, 2));
});

test('YouTube watch, share, embed, Shorts and live links use the same player', () => {
    for (const url of [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
        'https://youtu.be/dQw4w9WgXcQ?si=example',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://m.youtube.com/live/dQw4w9WgXcQ'
    ]) assert.deepEqual(media.videoSource(url), { kind: 'youtube', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
});

test('direct videos with signed query strings or fragments use a player; other pages use a link', () => {
    for (const src of ['https://example.com/demo.MP4?token=abc#t=2', 'data:video/webm;base64,AAAA']) {
        assert.deepEqual(media.videoSource(src), { kind: 'file', src });
    }
    const src = 'https://example.com/watch?v=dQw4w9WgXc';
    assert.deepEqual(media.videoSource(src), { kind: 'link', src });
});

test('unsupported protocols and incomplete links cannot become media links', () => {
    for (const src of ['javascript:alert(1)', 'file:///image.png', 'not a link']) {
        assert.equal(media.isImageSource(src), false);
        assert.equal(media.videoSource(src).kind, 'invalid');
    }
    assert.equal(media.videoSource('').kind, 'empty');
});
