import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface VehicleState {
    selectedVehicleId: string | null;
    isModalOpen: boolean;
}

const initialState: VehicleState = {
    selectedVehicleId: null,
    isModalOpen: false,
};

const vehicleSlice = createSlice({
    name: "vehicle",
    initialState,
    reducers: {
        setSelectedVehicleId: (state, action: PayloadAction<string | null>) => {
            state.selectedVehicleId = action.payload;
        },
        toggleVehicleModal: (state, action: PayloadAction<boolean>) => {
            state.isModalOpen = action.payload;
        },
    },
});

export const { setSelectedVehicleId, toggleVehicleModal } = vehicleSlice.actions;
export default vehicleSlice.reducer;
