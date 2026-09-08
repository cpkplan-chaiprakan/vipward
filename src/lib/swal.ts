import Swal from 'sweetalert2'

/**
 * SweetAlert2 ธีม Frost (navy / terracotta / sage / cream)
 * สไตล์อยู่ใน src/availability.css ส่วน .vipward-swal
 */
export const vipSwal = Swal.mixin({
  customClass: {
    popup: 'vipward-swal',
    title: 'vipward-swal__title',
    htmlContainer: 'vipward-swal__body',
    confirmButton: 'btn btn--primary vipward-swal__confirm',
    cancelButton: 'btn vipward-swal__cancel',
    denyButton: 'btn vipward-swal__deny',
    actions: 'vipward-swal__actions',
    closeButton: 'vipward-swal__close',
  },
  buttonsStyling: false,
  reverseButtons: true,
  showClass: { popup: 'vipward-swal-in' },
  hideClass: { popup: 'vipward-swal-out' },
})

export const vipToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  backdrop: false,
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  customClass: {
    container: 'vipward-toast-wrap',
    popup: 'vipward-toast',
    title: 'vipward-toast__title',
    timerProgressBar: 'vipward-toast__bar',
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

export function toastSuccess(title: string) {
  return vipToast.fire({ icon: 'success', title })
}

export function toastError(title: string) {
  return vipToast.fire({ icon: 'error', title, timer: 3600 })
}

export function alertError(title: string, text?: string) {
  return vipSwal.fire({ icon: 'error', title, text, confirmButtonText: 'ตกลง' })
}

export function confirmAction(options: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}) {
  return vipSwal.fire({
    icon: options.danger ? 'warning' : 'question',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    focusCancel: true,
    confirmButtonText: options.confirmText ?? 'ยืนยัน',
    cancelButtonText: options.cancelText ?? 'ยกเลิก',
    customClass: {
      popup: 'vipward-swal',
      title: 'vipward-swal__title',
      htmlContainer: 'vipward-swal__body',
      confirmButton: `btn btn--primary vipward-swal__confirm${options.danger ? ' vipward-swal__confirm--danger' : ''}`,
      cancelButton: 'btn vipward-swal__cancel',
      actions: 'vipward-swal__actions',
    },
  })
}
