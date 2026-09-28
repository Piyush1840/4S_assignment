export interface Property {
  readonly listingName: string;
  readonly region: string;
  readonly slug: string;
  readonly displayName: string;
}

export const ASSESSMENT = {
  directoryPath: '/find_a_hotel_or_resort/',
  property: {
    listingName: 'Los Cabos (Cabo Del Sol)',
    region: 'North America',
    slug: 'cabodelsol',
    displayName: 'Four Seasons Resort Cabo Del Sol',
  } satisfies Property,
  stay: {
    daysInFuture: 30,
    nights: 1,
    availabilitySearchDays: 14,
  },
} as const;

export function propertyHomeUrl(property: Property): RegExp {
  return new RegExp(`/${property.slug}/?(?:[?#].*)?$`, 'i');
}

export function roomResultsUrl(property: Property): RegExp {
  return new RegExp(`/${property.slug}/accommodations/?(?:[?#].*)?$`, 'i');
}
