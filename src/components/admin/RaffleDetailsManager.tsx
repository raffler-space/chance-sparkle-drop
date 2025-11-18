import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, Plus, Image } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Raffle {
  id: number;
  name: string;
  detailed_description: string;
  rules: string;
  gallery_images: string[];
}

const RaffleDetailsManager = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffleId, setSelectedRaffleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailedDescription, setDetailedDescription] = useState("");
  const [rules, setRules] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    loadRaffles();
  }, []);

  useEffect(() => {
    if (selectedRaffleId) {
      loadRaffleDetails(selectedRaffleId);
    }
  }, [selectedRaffleId]);

  const loadRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from("raffles")
        .select("id, name, detailed_description, rules, gallery_images")
        .order("id", { ascending: false });

      if (error) throw error;
      setRaffles(data || []);
      if (data && data.length > 0) {
        setSelectedRaffleId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading raffles:", error);
      toast({
        title: "Error",
        description: "Failed to load raffles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRaffleDetails = async (raffleId: number) => {
    const raffle = raffles.find(r => r.id === raffleId);
    if (raffle) {
      setDetailedDescription(raffle.detailed_description || "");
      setRules(raffle.rules || "");
      setGalleryImages(raffle.gallery_images || []);
    }
  };

  const handleSave = async () => {
    if (!selectedRaffleId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("raffles")
        .update({
          detailed_description: detailedDescription,
          rules: rules,
          gallery_images: galleryImages,
        })
        .eq("id", selectedRaffleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Raffle details updated successfully",
      });
      
      await loadRaffles();
    } catch (error) {
      console.error("Error saving raffle details:", error);
      toast({
        title: "Error",
        description: "Failed to save raffle details",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setGalleryImages([...galleryImages, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Raffle Details</CardTitle>
        <CardDescription>
          Add detailed descriptions, rules, and photo galleries for raffle detail pages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Raffle Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Raffle</label>
          <Select
            value={selectedRaffleId?.toString()}
            onValueChange={(value) => setSelectedRaffleId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a raffle" />
            </SelectTrigger>
            <SelectContent>
              {raffles.map((raffle) => (
                <SelectItem key={raffle.id} value={raffle.id.toString()}>
                  {raffle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRaffleId && (
          <>
            {/* Detailed Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Detailed Description</label>
              <Textarea
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Enter detailed description for the raffle detail page..."
                className="min-h-[150px]"
              />
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rules</label>
              <Textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Enter raffle rules and terms..."
                className="min-h-[150px]"
              />
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Photo Gallery</label>
              
              {/* Add New Image */}
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Enter image URL..."
                />
                <Button onClick={handleAddImage} type="button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Image List */}
              {galleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {galleryImages.map((imageUrl, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="relative aspect-video">
                        <img
                          src={imageUrl}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/400x300?text=Invalid+Image";
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs truncate">{imageUrl}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {galleryImages.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No gallery images yet. Add image URLs above.
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RaffleDetailsManager;
