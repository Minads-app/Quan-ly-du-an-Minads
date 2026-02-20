import QuotePDF from "@/components/modules/quotes/QuotePDF";

export default async function QuotePDFPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <QuotePDF quoteId={id} />;
}
