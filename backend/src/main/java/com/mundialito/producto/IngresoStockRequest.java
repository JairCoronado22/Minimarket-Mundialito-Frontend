package com.mundialito.producto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record IngresoStockRequest(
        @NotNull @Min(1) Integer cantidad) {
}
