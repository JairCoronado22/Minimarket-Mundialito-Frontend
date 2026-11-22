package com.mundialito.venta;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VentaRepository extends JpaRepository<Venta, Integer> {
    @Override
    @EntityGraph(attributePaths = "items")
    List<Venta> findAll();

    @EntityGraph(attributePaths = "items")
    List<Venta> findAllByFechaBetween(OffsetDateTime start, OffsetDateTime end);

    @Query("SELECT dv FROM DetalleVenta dv JOIN dv.venta v WHERE dv.productoId = :productoId AND v.fecha BETWEEN :start AND :end ORDER BY v.fecha")
    List<DetalleVenta> findDetalleByProductoAndFechaBetween(@Param("productoId") Long productoId, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
}
