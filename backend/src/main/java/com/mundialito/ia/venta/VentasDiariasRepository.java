package com.mundialito.ia.venta;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VentasDiariasRepository extends JpaRepository<VentasDiarias, Long> {

    List<VentasDiarias> findByProductoIdOrderByFechaAsc(Long productoId);

    List<VentasDiarias> findByProductoIdAndFechaBetweenOrderByFechaAsc(
            Long productoId, LocalDate start, LocalDate end);

    @Query("SELECT vd FROM VentasDiarias vd WHERE vd.fecha BETWEEN :start AND :end ORDER BY vd.fecha, vd.productoId")
    List<VentasDiarias> findByFechaBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT vd.productoId FROM VentasDiarias vd GROUP BY vd.productoId")
    List<Long> findDistinctProductoIds();
}
