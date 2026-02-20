import QuoteDetail from "@/components/modules/quotes/QuoteDetail";

export default async function QuoteViewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <QuoteDetail quoteId={id} />;
}
