import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2 } from "lucide-react";

interface AddressLookupInputProps {
  postcode: string;
  address: string;
  onPostcodeChange: (postcode: string) => void;
  onAddressChange: (address: string) => void;
}

export function AddressLookupInput({
  postcode,
  address,
  onPostcodeChange,
  onAddressChange,
}: AddressLookupInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupPostcode = async () => {
    const cleaned = postcode.trim().replace(/\s+/g, "");
    if (!cleaned) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
      const json = await res.json();

      if (json.status !== 200 || !json.result) {
        setError("Postcode not found. Please check and try again.");
        return;
      }

      const r = json.result;
      const parts = [
        r.admin_ward,
        r.admin_district,
        r.region || r.country,
        r.postcode,
      ].filter(Boolean);

      onPostcodeChange(r.postcode);
      onAddressChange(parts.join(", "));
    } catch {
      setError("Could not look up postcode. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupPostcode();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Postcode</Label>
        <div className="flex gap-2">
          <Input
            value={postcode}
            onChange={(e) => onPostcodeChange(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. SW1A 1AA"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={lookupPostcode}
            disabled={loading || !postcode.trim()}
            className="shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-1">Find</span>
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Address will auto-fill after postcode lookup, or type manually"
          rows={2}
        />
      </div>
    </div>
  );
}
