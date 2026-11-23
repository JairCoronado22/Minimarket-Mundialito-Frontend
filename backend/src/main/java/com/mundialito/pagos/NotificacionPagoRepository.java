package com.mundialito.pagos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificacionPagoRepository extends JpaRepository<NotificacionPago, Integer> {
    List<NotificacionPago> findByProcesada(Boolean procesada);
}
