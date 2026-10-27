(function () {
    'use strict';

    function bindSwipe(element, move, enabled = () => true) {
        let start = null;
        let suppressClickUntil = 0;
        element.addEventListener('pointerdown', event => {
            if (!event.isPrimary) { start = null; return; }
            if (event.pointerType === 'mouse' || !enabled()) return;
            start = { id: event.pointerId, x: event.clientX, y: event.clientY };
        });
        element.addEventListener('pointercancel', () => { start = null; });
        element.addEventListener('pointerup', event => {
            if (!start || start.id !== event.pointerId) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            start = null;
            if (!enabled() || Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
            suppressClickUntil = performance.now() + 500;
            move(dx < 0 ? 1 : -1);
        });
        // A swipe must not also open the image or follow the project card link.
        element.addEventListener('click', event => {
            if (performance.now() >= suppressClickUntil) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
    }

    function carousel(root) {
        if (root.dataset.galleryReady) return;
        root.dataset.galleryReady = 'true';
        const slides = [...root.querySelectorAll('[data-gallery-slide]')];
        const thumbnails = [...root.querySelectorAll('[data-gallery-to]')];
        const counters = [...root.querySelectorAll('[data-gallery-count]')];
        if (!slides.length) return;
        let index = 0;
        function show(next, scrollThumbnail = true) {
            index = (next + slides.length) % slides.length;
            root.dataset.galleryIndex = String(index);
            slides.forEach((slide, i) => {
                slide.hidden = i !== index;
                slide.classList.toggle('active', i === index);
                slide.setAttribute('aria-hidden', String(i !== index));
            });
            thumbnails.forEach(button => {
                const selected = Number(button.dataset.galleryTo) === index;
                button.classList.toggle('active', selected);
                button.setAttribute('aria-pressed', String(selected));
            });
            counters.forEach(counter => { counter.textContent = `${index + 1} / ${slides.length}`; });
            const strip = root.querySelector('[data-gallery-thumbnails]');
            const thumbnail = thumbnails.find(button => Number(button.dataset.galleryTo) === index);
            if (scrollThumbnail && strip && thumbnail) {
                const left = thumbnail.offsetLeft - strip.clientWidth / 2 + thumbnail.offsetWidth / 2;
                strip.scrollTo({ left, behavior: 'auto' });
            }
        }
        root.querySelectorAll('[data-gallery-step]').forEach(button => {
            button.disabled = slides.length < 2;
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                show(index + Number(button.dataset.galleryStep));
            });
        });
        thumbnails.forEach(button => button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            show(Number(button.dataset.galleryTo));
        }));
        root.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            event.stopPropagation();
            show(index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        slides.forEach(slide => {
            const img = slide.querySelector('img');
            if (!img) return;
            const update = () => slide.classList.toggle('is-error', img.complete && !img.naturalWidth);
            img.addEventListener('load', update);
            img.addEventListener('error', update);
            if (img.complete) update();
        });
        bindSwipe(root.querySelector('[data-gallery-swipe]') || root, direction => show(index + direction));
        show(0, false);
        return { show, get index() { return index; } };
    }

    function slideshow(root, interval = 3000) {
        const controller = carousel(root);
        const slides = [...root.querySelectorAll('[data-gallery-slide]')];
        if (!controller || slides.length < 2) return () => {};
        let timer = null;
        let visible = false;
        function preloadNext() {
            const img = slides[(controller.index + 1) % slides.length].querySelector('img');
            if (img) img.loading = 'eager';
        }
        function stop() {
            clearInterval(timer);
            timer = null;
        }
        function sync() {
            stop();
            if (!visible || document.hidden || !root.isConnected) return;
            preloadNext();
            timer = setInterval(() => {
                if (!root.isConnected) { cleanup(); return; }
                const next = (controller.index + 1) % slides.length;
                const img = slides[next].querySelector('img');
                // Keep the current image visible while the next file is loading.
                if (img && !img.complete) return;
                controller.show(next);
                preloadNext();
            }, interval);
        }
        const observer = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.1;
            sync();
        }, { threshold: 0.1 });
        observer.observe(root);
        document.addEventListener('visibilitychange', sync);
        function cleanup() {
            stop();
            observer.disconnect();
            document.removeEventListener('visibilitychange', sync);
        }
        return cleanup;
    }

    function viewer(images, name) {
        if (!images.length) return;
        const dialog = document.createElement('dialog');
        dialog.className = 'image-viewer';
        dialog.setAttribute('aria-label', `${name || 'Project'} image viewer`);
        dialog.innerHTML = `
            <div class="viewer-toolbar">
                <div><strong class="viewer-title"></strong><span class="viewer-count" aria-live="polite"></span></div>
                <div class="viewer-actions">
                    <button type="button" class="viewer-button" data-viewer-zoom aria-pressed="false">Zoom in</button>
                    <a class="viewer-button" data-viewer-original target="_blank" rel="noopener">Open original &nearr;</a>
                    <button type="button" class="viewer-button" data-viewer-close aria-label="Close image viewer" autofocus>Close &times;</button>
                </div>
            </div>
            <div class="viewer-stage" data-viewer-stage>
                <img class="viewer-image" alt="" draggable="false">
                <p class="viewer-error" hidden>Image could not be loaded. Try Open original or browse the next image.</p>
            </div>
            <div class="viewer-navigation">
                <button type="button" class="viewer-button" data-viewer-previous aria-label="Previous image">&larr; Previous</button>
                <span>Swipe or use &larr; &rarr; &middot; Esc to close</span>
                <button type="button" class="viewer-button" data-viewer-next aria-label="Next image">Next &rarr;</button>
            </div>`;
        document.body.appendChild(dialog);
        const img = dialog.querySelector('img');
        const stage = dialog.querySelector('[data-viewer-stage]');
        const error = dialog.querySelector('.viewer-error');
        const zoom = dialog.querySelector('[data-viewer-zoom]');
        const original = dialog.querySelector('[data-viewer-original]');
        const previous = dialog.querySelector('[data-viewer-previous]');
        const next = dialog.querySelector('[data-viewer-next]');
        let index = 0;
        let zoomed = false;
        let returnFocus = null;
        let previousOverflow = '';

        function setZoom(value) {
            zoomed = value;
            stage.classList.toggle('is-zoomed', value);
            img.style.width = value ? Math.max(img.naturalWidth, stage.clientWidth * 1.5) + 'px' : '';
            zoom.textContent = value ? 'Fit image' : 'Zoom in';
            zoom.setAttribute('aria-pressed', String(value));
            stage.scrollTop = 0;
            stage.scrollLeft = 0;
        }
        function show(value) {
            index = (value + images.length) % images.length;
            setZoom(false);
            img.hidden = false;
            error.hidden = true;
            zoom.disabled = true;
            img.alt = `${name || 'Project'} — ${index === 0 ? 'cover image' : 'image ' + (index + 1)}`;
            img.src = images[index];
            original.href = images[index];
            original.hidden = !/^https?:\/\//i.test(images[index]);
            dialog.querySelector('.viewer-title').textContent = name || 'Project images';
            dialog.querySelector('.viewer-count').textContent = `${index + 1} / ${images.length}`;
            previous.disabled = next.disabled = images.length < 2;
        }
        img.addEventListener('load', () => { zoom.disabled = false; });
        img.addEventListener('error', () => { img.hidden = true; error.hidden = false; zoom.disabled = true; });
        img.addEventListener('click', () => { if (!zoom.disabled) setZoom(!zoomed); });
        zoom.addEventListener('click', () => setZoom(!zoomed));
        previous.addEventListener('click', () => show(index - 1));
        next.addEventListener('click', () => show(index + 1));
        dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
        dialog.addEventListener('keydown', event => {
            if (zoomed || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            show(index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        dialog.addEventListener('close', () => {
            document.body.style.overflow = previousOverflow;
            setZoom(false);
            if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
        });
        bindSwipe(stage, direction => show(index + direction), () => !zoomed);
        return {
            open(value, opener) {
                returnFocus = opener || document.activeElement;
                previousOverflow = document.body.style.overflow;
                show(value);
                dialog.showModal();
                document.body.style.overflow = 'hidden';
            }
        };
    }

    window.ProjectGalleries = { carousel, slideshow, viewer };
})();
