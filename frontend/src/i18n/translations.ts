export const translations = {
  en: {
    nav: {
      title: 'Trackwave',
      dashboard: 'Dashboard',
      search: 'Search',
      artists: 'My Artists',
    },
    dashboard: {
      title: 'Latest Releases',
      subtitle: 'New tracks and albums from artists you follow.',
      refresh: 'Refresh',
      filterLabel: 'Released in the last months',
      noFollowed: 'Follow artists first to build your release feed.',
      noReleases: 'No releases found for your current filter.',
      loading: 'Loading releases...',
    },
    search: {
      title: 'Artist Search',
      subtitle: 'Find artists and add them to your watchlist.',
      inputLabel: 'Search artist',
      placeholder: 'Type artist name...',
      noResults: 'No artists found.',
      loading: 'Searching artists...',
    },
    artists: {
      title: 'My Artists',
      subtitle: 'Manage your followed artists.',
      empty: 'No followed artists yet.',
      followedSince: 'Followed on',
      details: 'Details',
    },
    artistDetail: {
      title: 'Artist Details',
      subtitle: 'Planned for phase 2.',
      back: 'Back to my artists',
      idLabel: 'Artist ID',
    },
    release: {
      album: 'Album',
      single: 'Single',
      compilation: 'Compilation',
      tracks: 'tracks',
      openSpotify: 'Open on Spotify',
    },
    actions: {
      follow: 'Follow',
      unfollow: 'Unfollow',
    },
    language: {
      switchToGerman: 'Deutsch',
      switchToEnglish: 'English',
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
    },
  },
  de: {
    nav: {
      title: 'Trackwave',
      dashboard: 'Dashboard',
      search: 'Suche',
      artists: 'Meine Artists',
    },
    dashboard: {
      title: 'Neueste Releases',
      subtitle: 'Neue Songs und Alben von deinen gefolgten Artists.',
      refresh: 'Aktualisieren',
      filterLabel: 'Veröffentlicht in den letzten Monaten',
      noFollowed: 'Folge zuerst Artists, um deinen Release-Feed zu sehen.',
      noReleases: 'Für den aktuellen Filter wurden keine Releases gefunden.',
      loading: 'Releases werden geladen...',
    },
    search: {
      title: 'Artist-Suche',
      subtitle: 'Finde Artists und füge sie deiner Liste hinzu.',
      inputLabel: 'Artist suchen',
      placeholder: 'Artist-Namen eingeben...',
      noResults: 'Keine Artists gefunden.',
      loading: 'Artists werden gesucht...',
    },
    artists: {
      title: 'Meine Artists',
      subtitle: 'Verwalte deine gefolgten Artists.',
      empty: 'Noch keine Artists gefolgt.',
      followedSince: 'Gefolgt seit',
      details: 'Details',
    },
    artistDetail: {
      title: 'Artist-Details',
      subtitle: 'Geplant für Phase 2.',
      back: 'Zurück zu meinen Artists',
      idLabel: 'Artist-ID',
    },
    release: {
      album: 'Album',
      single: 'Single',
      compilation: 'Kompilation',
      tracks: 'Tracks',
      openSpotify: 'Auf Spotify öffnen',
    },
    actions: {
      follow: 'Folgen',
      unfollow: 'Entfolgen',
    },
    language: {
      switchToGerman: 'Deutsch',
      switchToEnglish: 'English',
    },
    errors: {
      generic: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    },
  },
} as const

export type SupportedLanguage = keyof typeof translations
