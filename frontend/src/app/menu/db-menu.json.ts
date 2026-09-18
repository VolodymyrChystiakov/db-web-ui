import { footer } from './footer-menu.json';

export const dbMenuObject = {
    menu: {
        main: [
            {
                title: 'Query Database',
                url: 'query',
                id: 'query',
                icon: 'assets/icons/fa-database.svg',
                active: () => location.href.includes('/query') || location.href.includes('/lookup'),
            },
            {
                title: 'Full Text Search',
                url: 'fulltextsearch',
                id: 'fulltextsearch',
                icon: 'assets/icons/fa-magnifying-glass.svg',
                active: () => location.href.includes('fulltextsearch'),
            },
            {
                title: 'Syncupdates',
                url: 'syncupdates',
                id: 'syncupdates',
                icon: 'assets/icons/fa-arrows-rotate.svg',
            },
            {
                title: 'Create an Object',
                url: 'webupdates/select',
                id: 'select',
                icon: 'assets/icons/fa-layer-plus.svg',
                active: () => location.href.includes('webupdates/select') || location.href.includes('webupdates/create'),
            },
        ],
        footer: footer,
    },
};
