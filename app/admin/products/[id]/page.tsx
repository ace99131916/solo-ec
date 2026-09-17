import ProductEditor from './editor';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductEditor productId={params.id} />;
}
