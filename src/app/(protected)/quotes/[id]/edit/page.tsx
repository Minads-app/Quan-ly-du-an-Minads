import QuoteForm from "@/components/modules/quotes/QuoteForm";

export default async function EditQuotePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <QuoteForm quoteId={id} />;
}
