Imports System.Windows.Forms

Public Class OrbisPowerUtils

    Public Structure BatteryInfo

        Private _BatteryPercentage As Single
        Private _BatteryStatus As BatteryChargeStatus
        Private _BatteryChargeRemaining As Integer
        Private _BatteryChargeUntilFull As Integer

        Public Property BatteryPercentage As Single
            Get
                Return _BatteryPercentage
            End Get
            Set
                _BatteryPercentage = Value
            End Set
        End Property

        Public Property BatteryStatus As BatteryChargeStatus
            Get
                Return _BatteryStatus
            End Get
            Set
                _BatteryStatus = Value
            End Set
        End Property

        Public Property BatteryChargeRemaining As Integer
            Get
                Return _BatteryChargeRemaining
            End Get
            Set
                _BatteryChargeRemaining = Value
            End Set
        End Property

        Public Property BatteryChargeUntilFull As Integer
            Get
                Return _BatteryChargeUntilFull
            End Get
            Set
                _BatteryChargeUntilFull = Value
            End Set
        End Property

    End Structure

    Public Shared Function IsMobileDevice() As Boolean
        Dim CurrentPowerStatus As PowerStatus = SystemInformation.PowerStatus
        Dim CurrentBatteryChargeStatus As BatteryChargeStatus = CurrentPowerStatus.BatteryChargeStatus

        If CurrentBatteryChargeStatus = BatteryChargeStatus.NoSystemBattery Then
            Return False
        Else
            Return True
        End If
    End Function

    Public Shared Function GetBatteryInfo() As BatteryInfo
        Dim CurrentPowerStatus As PowerStatus = SystemInformation.PowerStatus
        Dim CurrentBatteryChargeStatus As BatteryChargeStatus = CurrentPowerStatus.BatteryChargeStatus
        Dim NewBatteryInfo As New BatteryInfo With {
            .BatteryPercentage = CurrentPowerStatus.BatteryLifePercent,
            .BatteryStatus = CurrentBatteryChargeStatus,
            .BatteryChargeRemaining = CurrentPowerStatus.BatteryLifeRemaining,
            .BatteryChargeUntilFull = CurrentPowerStatus.BatteryFullLifetime
        }
        Return NewBatteryInfo
    End Function

    Public Shared Function GetBatteryImage(BatteryPercentageValue As Single, Optional IsCharging As Boolean = False) As ImageSource
        'PowerStatus reports a fraction (0..1), not a percentage. Always choose an asset,
        'including empty/unknown batteries, so BitmapImage cannot initialize without a URI.
        Dim percent = If(Single.IsNaN(BatteryPercentageValue), 0, CInt(Math.Clamp(BatteryPercentageValue, 0.0F, 1.0F) * 100))
        Dim asset As String
        If percent >= 100 Then
            asset = If(IsCharging, "BatteryFullCharging", "BatteryFull")
        ElseIf percent >= 80 Then
            asset = "Battery80"
        ElseIf percent >= 60 Then
            asset = "Battery60"
        ElseIf percent >= 40 Then
            asset = "Battery40"
        ElseIf percent >= 20 Then
            asset = "Battery20"
        Else
            asset = "BatteryCritical"
        End If
        Return New BitmapImage(New Uri("pack://application:,,,/openPS4;component/Icons/Battery/" & asset & ".png"))
    End Function
End Class
