(function () {
    'use strict';

    function mount(root) {
        const stage = root.querySelector('[data-project-stage]');
        const slides = [...stage.querySelectorAll('[data-project-slide]')];
        const previous = root.querySelector('[data-project-previous]');
        const next = root.querySelector('[data-project-next]');
        const counter = root.querySelector('[data-project-count]');
        const announcement = root.querySelector('[data-project-announcement]');
        counter.textContent = `00 / ${String(slides.length).padStart(2, '0')}`;
        stage.tabIndex = slides.length ? 0 : -1;
        const events = new AbortController();
        const options = { signal: events.signal };
        let index = 0;
        let timer = null;
        let visible = false;
        let hovered = false;
        let focused = false;
        let touching = false;

        function sync() {
            clearTimeout(timer);
            const held = hovered || focused || touching;
            root.dataset.paused = String(held);
            if (held || !visible || document.hidden || slides.length < 2 || !root.isConnected) return;
            timer = setTimeout(() => show(index + 1), 5000);
        }
        function show(value, manual = false) {
            if (!slides.length) return;
            index = (value + slides.length) % slides.length;
            root.dataset.projectIndex = String(index);
            slides.forEach((slide, i) => {
                let distance = (i - index + slides.length) % slides.length;
                if (distance > slides.length / 2) distance -= slides.length;
                const position = distance === 0 ? 'active' : distance === -1 ? 'left' : distance === 1 ? 'right' : distance < 0 ? 'far-left' : 'far-right';
                slide.dataset.position = position;
                slide.inert = Math.abs(distance) > 1;
                slide.setAttribute('aria-hidden', String(distance !== 0));
                const link = slide.querySelector('.proj-card');
                link.tabIndex = distance === 0 ? 0 : -1;
                const gallery = slide.querySelector('[data-image-gallery]');
                if (Math.abs(distance) <= 1) {
                    const preview = gallery?.querySelector('[data-gallery-slide]:not([hidden]) img');
                    if (preview) preview.loading = 'eager';
                }
                gallery?.dispatchEvent(new Event('slideshowstatechange'));
            });
            counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
            if (manual) announcement.textContent = `${slides[index].dataset.projectName}. Project ${index + 1} of ${slides.length}.`;
            sync();
        }

        previous.disabled = next.disabled = slides.length < 2;
        previous.addEventListener('click', () => show(index - 1, true), options);
        next.addEventListener('click', () => show(index + 1, true), options);
        stage.addEventListener('click', event => {
            const slide = event.target.closest('[data-project-slide]');
            if (!slide || slide.dataset.position === 'active') return;
            event.preventDefault();
            show(slides.indexOf(slide), true);
        }, options);
        slides.forEach(slide => {
            slide.addEventListener('pointerenter', event => {
                if (event.pointerType !== 'mouse') return;
                hovered = true;
                sync();
            }, options);
            slide.addEventListener('pointerleave', event => {
                if (event.pointerType !== 'mouse') return;
                hovered = false;
                sync();
            }, options);
        });
        stage.addEventListener('focusin', event => { focused = event.target.matches(':focus-visible'); sync(); }, options);
        stage.addEventListener('focusout', event => {
            focused = !!event.relatedTarget && stage.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible');
            sync();
        }, options);
        stage.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse') return;
            touching = true;
            sync();
        }, options);
        const releaseTouch = () => { touching = false; sync(); };
        stage.addEventListener('pointerup', releaseTouch, options);
        stage.addEventListener('pointercancel', releaseTouch, options);
        root.addEventListener('keydown', event => {
            const target = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : null;
            if (target === null || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            show(target, true);
        }, options);
        const stopSwipe = ProjectGalleries.bindSwipe(stage, direction => show(index + direction, true), () => slides.length > 1);
        const stopImages = slides.map(slide => ProjectGalleries.slideshow(
            slide.querySelector('[data-image-gallery]'), 3500, () => slide.dataset.position === 'active'
        ));
        const observer = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.15;
            sync();
        }, { threshold: 0.15 });
        observer.observe(stage);
        document.addEventListener('visibilitychange', sync, options);
        show(0);
        return () => {
            clearTimeout(timer);
            observer.disconnect();
            events.abort();
            stopSwipe();
            stopImages.forEach(stop => stop());
        };
    }

    window.ProjectDeck = { mount };
})();
