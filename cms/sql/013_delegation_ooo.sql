-- Phase 2 #2: review owner delegation, escalate, Reviewer OOO + temp elevation

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS review_owner_id UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS review_owner_proposed_id UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS review_owner_proposed_by UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS review_owner_proposed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS content_items_review_owner_idx
  ON content_items (review_owner_id)
  WHERE review_owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS content_items_review_owner_proposed_idx
  ON content_items (review_owner_proposed_id)
  WHERE review_owner_proposed_id IS NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_away BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS away_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS away_delegate_user_id UUID REFERENCES users (id),
  ADD COLUMN IF NOT EXISTS role_before_away user_role;

COMMENT ON COLUMN content_items.review_owner_id IS
  'Confirmed review owner (Reviewer or Super Admin).';
COMMENT ON COLUMN content_items.review_owner_proposed_id IS
  'Pending review-owner proposal awaiting Super Admin confirm (V2).';
COMMENT ON COLUMN users.is_away IS
  'Reviewer Out Of Office; review actions frozen until cleared.';
COMMENT ON COLUMN users.away_delegate_user_id IS
  'Editor temporarily elevated to Reviewer for OOO duration.';
