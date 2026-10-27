import type * as React from 'react';

export type Status = 'go' | 'caution' | 'stop';

export interface SiteHeaderProps { clubName?: string; items: { label: string; href?: string }[]; active?: string; cta?: string; ctaHref?: string; loginHref?: string; homeHref?: string }
export declare function SiteHeader(props: SiteHeaderProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'wing' | 'quiet' | 'ghost'; size?: 'md' | 'lg'; href?: string; icon?: 'check' | 'alert' | 'cross' | 'arrow' | 'wing' }
export declare function Button(props: ButtonProps): React.ReactElement;

export interface FlightStatusProps { status: Status; label?: string }
export declare function FlightStatus(props: FlightStatusProps): React.ReactElement;

export interface WeatherCardProps { station: string; altitude?: string | number; status: Status; wind: number; gust: number; /** degrees the wind comes FROM */ direction: number; temperature: number; cloudBase?: string | number; updated?: string; source?: string }
export declare function WeatherCard(props: WeatherCardProps): React.ReactElement;

export interface SpotCardProps { name: string; region?: string; /** omitted values are left out, never guessed */ takeoff?: string | number; landing?: string | number; directions?: ('N' | 'NO' | 'O' | 'SO' | 'S' | 'SW' | 'W' | 'NW')[]; level?: 'Einsteiger' | 'Fortgeschritten' | 'Profi'; note?: string; status?: Status; /** e.g. 'Alpbetrieb' instead of the default word */ statusLabel?: string; href?: string; cta?: string; /** no routeHref = no Route button */ routeHref?: string }
export declare function SpotCard(props: SpotCardProps): React.ReactElement;

export interface SpotMarkerProps { label: string; status: Status; active?: boolean; onClick?: () => void }
export declare function SpotMarker(props: SpotMarkerProps): React.ReactElement;

export interface BuyBoxProps { title?: string; price: number; currency?: string; per?: string; perks?: React.ReactNode[]; methods?: string[]; cta?: string; badge?: string; /** one line under the payment methods, e.g. the membership hint */ note?: React.ReactNode; onBuy?: () => void }
export declare function BuyBox(props: BuyBoxProps): React.ReactElement;

export interface PassCardProps { holder: string; /** portrait URL; omitted = initials */ photo?: string; season: string; number: string; kind?: string; fields?: [string, string][]; /** the real QR element from the backend; omitted = a sample pattern */ qr?: React.ReactNode; hint?: string; wallet?: boolean; onAppleWallet?: () => void; onGoogleWallet?: () => void }
export declare function PassCard(props: PassCardProps): React.ReactElement;

export interface ListingCardProps { category: string; title: string; price: number; tags?: string[]; seller?: string; posted?: string; image?: string; imageAlt?: string; isNew?: boolean }
export declare function ListingCard(props: ListingCardProps): React.ReactElement;

export interface ProductCardProps { name: string; price: number; line?: string; image?: string; imageAlt?: string; badge?: string; /** real textile colours as hex, each with a name */ colors?: { name: string; value: string }[]; sizes?: string[]; soldOut?: string[]; hint?: string; onAdd?: (choice: { color: string | null; size: string | null }) => void }
export declare function ProductCard(props: ProductCardProps): React.ReactElement;

export interface DataTableColumn<R> { key: string; label: string; align?: 'left' | 'right'; render?: (row: R) => React.ReactNode }
export interface DataTableProps<R = Record<string, unknown>> { columns: DataTableColumn<R>[]; rows: R[]; caption?: string }
export declare function DataTable<R>(props: DataTableProps<R>): React.ReactElement;
export declare namespace DataTable { function Role(props: { children: React.ReactNode }): React.ReactElement }

export interface StatTileProps { label: string; value: string; delta?: string; trend?: 'up' | 'down'; hint?: string }
export declare function StatTile(props: StatTileProps): React.ReactElement;

declare global { interface Window { GKG: { SiteHeader: typeof SiteHeader; Button: typeof Button; FlightStatus: typeof FlightStatus; WeatherCard: typeof WeatherCard; SpotCard: typeof SpotCard; SpotMarker: typeof SpotMarker; BuyBox: typeof BuyBox; PassCard: typeof PassCard; ListingCard: typeof ListingCard; ProductCard: typeof ProductCard; DataTable: typeof DataTable; StatTile: typeof StatTile } } }
