package com.mundialito.venta;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CrearVentaRequest(
        @NotBlank @Size(max = 120) String cajero,
        @NotBlank @Size(max = 80) String terminal,
        @NotBlank String medioPago,
        @NotEmpty List<@Valid ItemVentaRequest> items) {

    public record ItemVentaRequest(
            @NotNull @Positive Long productoId,
            @NotNull @Positive Integer cantidad) {
    }
}
