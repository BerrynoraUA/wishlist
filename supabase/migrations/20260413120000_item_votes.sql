-- Item votes table (upvote/like for wishlist items)
CREATE TABLE IF NOT EXISTS "public"."item_vote" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."item_vote" OWNER TO "postgres";

-- Primary key
ALTER TABLE ONLY "public"."item_vote"
    ADD CONSTRAINT "item_vote_pkey" PRIMARY KEY ("id");

-- Unique constraint: one vote per user per item
ALTER TABLE ONLY "public"."item_vote"
    ADD CONSTRAINT "item_vote_item_id_user_id_key" UNIQUE ("item_id", "user_id");

-- Foreign keys
ALTER TABLE ONLY "public"."item_vote"
    ADD CONSTRAINT "item_vote_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."item_vote"
    ADD CONSTRAINT "item_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_item_vote_item" ON "public"."item_vote" USING "btree" ("item_id");
CREATE INDEX "idx_item_vote_user" ON "public"."item_vote" USING "btree" ("user_id");

-- RLS
ALTER TABLE "public"."item_vote" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read votes" ON "public"."item_vote"
    FOR SELECT USING (("auth"."uid"() IS NOT NULL));

CREATE POLICY "Users can insert own vote" ON "public"."item_vote"
    FOR INSERT WITH CHECK ("auth"."uid"() = "user_id");

CREATE POLICY "Users can delete own vote" ON "public"."item_vote"
    FOR DELETE USING ("auth"."uid"() = "user_id");

-- Grants
GRANT ALL ON TABLE "public"."item_vote" TO "anon";
GRANT ALL ON TABLE "public"."item_vote" TO "authenticated";
GRANT ALL ON TABLE "public"."item_vote" TO "service_role";
