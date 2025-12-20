-- AlterTable: Add ticketNumber column (nullable first)
ALTER TABLE "SupportTicket" ADD COLUMN "ticketNumber" TEXT;

-- Generate ticket numbers for existing tickets
DO $$
DECLARE
    ticket_record RECORD;
    ticket_date TEXT;
    ticket_num TEXT;
    counter INT := 0;
BEGIN
    FOR ticket_record IN SELECT id, "createdAt" FROM "SupportTicket" WHERE "ticketNumber" IS NULL
    LOOP
        ticket_date := TO_CHAR(ticket_record."createdAt", 'YYYYMMDD');
        ticket_num := 'TKT-' || ticket_date || '-' || LPAD(counter::TEXT, 6, '0');
        
        -- Ensure uniqueness by checking if it exists
        WHILE EXISTS (SELECT 1 FROM "SupportTicket" WHERE "ticketNumber" = ticket_num) LOOP
            counter := counter + 1;
            ticket_num := 'TKT-' || ticket_date || '-' || LPAD(counter::TEXT, 6, '0');
        END LOOP;
        
        UPDATE "SupportTicket" SET "ticketNumber" = ticket_num WHERE id = ticket_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make ticketNumber NOT NULL and add unique constraint
ALTER TABLE "SupportTicket" ALTER COLUMN "ticketNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_ticketNumber_idx" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_orgId_idx" ON "SupportTicket"("orgId");

