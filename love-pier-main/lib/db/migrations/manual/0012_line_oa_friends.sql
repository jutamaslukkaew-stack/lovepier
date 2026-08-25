-- Track LINE OA friends independently from LIFF/order activity.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS line_friend_status boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS line_followed_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS line_unfollowed_at timestamptz;

CREATE INDEX IF NOT EXISTS customers_line_friend_status_idx
  ON customers(line_friend_status) WHERE line_friend_status = true;
