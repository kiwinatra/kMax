// src/ui/faqModal.ts
import { createElement, qs } from '../core/dom';
import { getLocale } from '../locales';

interface FaqItem {
    question: string;
    answer: string;
}

const FAQ_DATA: FaqItem[] = [
    {
        question: 'Что делает мод?',
        answer: 'Мод добавляет дополнительные функции для удобства использования сайта.'
    },
    {
        question: 'Как отключить мод?',
        answer: 'Просто обновите страницу или отключите скрипт в расширении.'
    },
    {
        question: 'Будет ли обновление?',
        answer: 'Да, в зависимости от потребностей и обратной связи.'
    }
];

const modalStyles = `
    @keyframes kmodFadeIn {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    .kmod-modal-content {
        animation: kmodFadeIn 0.2s ease-out;
    }
`;

export function createFaqModal(): void {
    const existing = qs('.kmod-faq-modal');
    if (existing) {
        existing.remove();
        return;
    }

    if (!document.querySelector('#kmod-modal-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'kmod-modal-styles';
        styleEl.textContent = modalStyles;
        document.head.appendChild(styleEl);
    }

    const modal = createElement('div', {
        className: 'kmod-faq-modal',
        styles: {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '999999',
        },
    });

    const content = createElement('div', {
        className: 'kmod-modal-content',
        styles: {
            background: '#1e1e2a',
            padding: '0',
            borderRadius: '12px',
            minWidth: '420px',
            maxWidth: '480px',
            width: '90%',
            maxHeight: '80vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            position: 'relative',
            overflow: 'hidden',
        },
    });

    const header = createElement('div', {
        styles: {
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
    });

    const title = createElement('h2', {
        text: getLocale('faqTitle'),
        styles: {
            color: '#eee',
            margin: '0',
            fontSize: '18px',
            fontWeight: '600',
        },
    });

    const closeBtn = createElement('button', {
        text: '✕',
        styles: {
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s',
        },
        events: {
            mouseover: () => { closeBtn.style.color = '#fff'; closeBtn.style.background = 'rgba(255,255,255,0.06)'; },
            mouseout: () => { closeBtn.style.color = '#666'; closeBtn.style.background = 'transparent'; },
            click: () => modal.remove(),
        },
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = createElement('div', {
        styles: {
            padding: '20px 24px',
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 130px)',
        },
    });

    const faqContainer = createElement('div', {
        styles: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        },
    });

    for (const item of FAQ_DATA) {
        const wrapper = createElement('div', {
            styles: {
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
            },
        });

        const question = createElement('div', {
            text: item.question,
            styles: {
                color: '#eee',
                fontWeight: '600',
                marginBottom: '4px',
                fontSize: '14px',
            },
        });

        const answer = createElement('div', {
            text: item.answer,
            styles: {
                color: '#888',
                fontSize: '13px',
                lineHeight: '1.5',
            },
        });

        wrapper.appendChild(question);
        wrapper.appendChild(answer);
        faqContainer.appendChild(wrapper);
    }

    body.appendChild(faqContainer);

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    document.body.appendChild(modal);
}

export function openFaqModal(): void {
    createFaqModal();
}