import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Types inferred from API schema
type EquipmentListResponse = z.infer<typeof api.equipment.list.responses[200]>;
type EquipmentDetailResponse = z.infer<typeof api.equipment.get.responses[200]>;
type CreateEquipmentInput = z.infer<typeof api.equipment.create.input>;
type UpdateEquipmentInput = z.infer<typeof api.equipment.update.input>;

export function useEquipmentList() {
  return useQuery({
    queryKey: ["/api/equipment"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/equipment");
      return api.equipment.list.responses[200].parse(await res.json());
    },
  });
}

export function useEquipment(id: number | null) {
  return useQuery({
    queryKey: ["/api/equipment", id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.equipment.get.path, { id });
      const res = await apiRequest("GET", url);
      return api.equipment.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// ✅ NEW: Update Status Mutation for Active/Condemnation
export function useUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      // Direct PATCH request to status endpoint
      const res = await apiRequest("PATCH", `/api/equipment/${id}/status`, { status });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Status Changed",
        description: "Equipment status has been updated on dashboard.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEquipmentInput) => {
      const res = await apiRequest("POST", "/api/equipment", data);
      return api.equipment.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Record Saved",
        description: "Equipment history sheet has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEquipmentInput }) => {
      const url = buildUrl(api.equipment.update.path, { id });
      const res = await apiRequest("PUT", url, data);
      return api.equipment.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", id] });
      toast({
        title: "Changes Saved",
        description: "The record has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.equipment.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Deleted",
        description: "Record removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}